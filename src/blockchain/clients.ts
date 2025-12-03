import { createPublicClient, createWalletClient, http, type Chain, type PublicClient, type WalletClient } from 'viem';
import { sepolia, optimismSepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config, getChainConfig, type ChainConfig } from '../config';

const account = privateKeyToAccount(config.backendPrivateKey);

export const knownChains: Record<number, Chain> = {
  [sepolia.id]: sepolia,
  [optimismSepolia.id]: optimismSepolia,
  [baseSepolia.id]: baseSepolia,
  [arbitrumSepolia.id]: arbitrumSepolia,
};

const publicClientCache = new Map<number, PublicClient>();
const walletClientCache = new Map<number, WalletClient>();

export function createCustomChain(chainConfig: ChainConfig): Chain {
  if (typeof chainConfig.chainId !== 'number') {
    throw new Error(`Cannot create EVM chain for non-numeric chain ID: ${chainConfig.chainId}`);
  }
  
  return {
    id: chainConfig.chainId,
    name: chainConfig.name,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [chainConfig.rpc],
      },
    },
  };
}

export function getPublicClient(chainId: number | string): PublicClient {
  const numericChainId = chainId as number;
  
  if (publicClientCache.has(numericChainId)) {
    return publicClientCache.get(numericChainId)!;
  }

  const chainConfig = getChainConfig(numericChainId);
  const chain = knownChains[numericChainId] || createCustomChain(chainConfig as any);

  const client = createPublicClient({
    chain,
    transport: http(chainConfig.rpc),
  });

  publicClientCache.set(numericChainId, client);
  return client;
}

export function getWalletClient(chainId: number | string): WalletClient {
  const numericChainId = chainId as number;
  
  if (walletClientCache.has(numericChainId)) {
    return walletClientCache.get(numericChainId)!;
  }

  const chainConfig = getChainConfig(numericChainId);
  const chain = knownChains[numericChainId] || createCustomChain(chainConfig as any);

  const client = createWalletClient({
    account,
    chain,
    transport: http(chainConfig.rpc),
  });

  walletClientCache.set(numericChainId, client);
  return client;
}

