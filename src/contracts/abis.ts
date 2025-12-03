// Anchor contract ABI for commit operations
// Note: Contract function parameter names may still use 'credentialHash' for compatibility
export const ANCHOR_ABI = [
  {
    inputs: [
      { name: 'credentialHash', type: 'bytes32' }, // Represents commitHash
      { name: 'expiry', type: 'uint256' }
    ],
    name: 'publishCommit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'credentialHash', type: 'bytes32' }], // Represents commitHash
    name: 'isValid',
    outputs: [{ name: 'valid', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'credentialHash', type: 'bytes32' }], // Represents commitHash
    name: 'revokeCommit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'credentialHash', type: 'bytes32' }], // Represents commitHash
    name: 'getCommit',
    outputs: [
      { name: 'published', type: 'bool' },
      { name: 'revoked', type: 'bool' },
      { name: 'issuer', type: 'address' },
      { name: 'publishedAt', type: 'uint256' },
      { name: 'revokedAt', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
      { name: 'zkVerifyAttestationId', type: 'bytes32' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Verifier contract ABI for cross-chain verification
// Note: Contract function parameter names may still use 'credentialHash' for compatibility
export const VERIFIER_ABI = [
  {
    inputs: [
      { name: 'credentialHash', type: 'bytes32' }, // Represents commitHash
      { name: 'originChainId', type: 'uint256' },
      { name: 'originChainAnchor', type: 'address' },
      { name: 'proof', type: 'bytes' }
    ],
    name: 'verifyCredential',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'credentialHash', type: 'bytes32' }, // Represents commitHash
      { name: 'originChainId', type: 'uint256' }
    ],
    name: 'isVerified',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'credentialHash', type: 'bytes32' }, // Represents commitHash
      { name: 'originChainId', type: 'uint256' }
    ],
    name: 'getVerification',
    outputs: [
      { name: 'verified', type: 'bool' },
      { name: 'verifiedAt', type: 'uint256' },
      { name: 'originChainAnchor', type: 'address' },
      { name: '_originChainId', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Registry contract ABI for commit registry lookups
// Note: Contract function parameter names may still use 'credentialHash' for compatibility
export const REGISTRY_ABI = [
  {
    inputs: [{ name: 'credentialHash', type: 'bytes32' }], // Represents commitHash
    name: 'registry',
    outputs: [
      { name: 'credentialHash', type: 'bytes32' }, // Represents commitHash
      { name: 'holder', type: 'address' },
      { name: 'issuer', type: 'address' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

