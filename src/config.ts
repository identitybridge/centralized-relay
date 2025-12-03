import dotenv from 'dotenv';
import chainsData from './config/chains';
import { privateKeyToAccount } from 'viem/accounts';
dotenv.config();

export interface ChainConfig {
  chainId: number | string;
  name: string;
  rpc: string;
  anchorAddress?: `0x${string}` | string;
  verifierAddress?: `0x${string}` | string;
  registryAddress?: `0x${string}` | string;
  blockExplorerUrl?: string;
}

export interface Config {
  port: number;
  chains: Map<number | string, ChainConfig>;
  defaultOriginChainId: number | string;
  defaultDestChainId: number | string;
  backendPrivateKey: `0x${string}`;
}

function buildRpcUrl(rpcTemplate: string): string {
  const infuraApiKey = process.env.INFURA_API_KEY;
  
  if (rpcTemplate.endsWith('/v3/')) {
    if (!infuraApiKey) {
      console.warn(`RPC URL ${rpcTemplate} requires INFURA_API_KEY but it's not set`);
      return rpcTemplate;
    }
    return `${rpcTemplate}${infuraApiKey}`;
  }
  
  return rpcTemplate;
}

function parseChainConfig(): Map<number | string, ChainConfig> {
  const chains = new Map<number | string, ChainConfig>();
  
  // Support legacy single chain configuration
  if (process.env.ORIGIN_CHAIN_ID && process.env.ORIGIN_CHAIN_RPC) {
    const originChainId = parseInt(process.env.ORIGIN_CHAIN_ID);
    chains.set(originChainId, {
      chainId: originChainId,
      name: (process.env.ORIGIN_CHAIN_NAME || `chain-${originChainId}`).toLowerCase(),
      rpc: buildRpcUrl(process.env.ORIGIN_CHAIN_RPC),
      anchorAddress: process.env.ANCHOR_CONTRACT_ADDRESS as `0x${string}` | undefined,
      blockExplorerUrl: process.env.ORIGIN_CHAIN_BLOCK_EXPLORER_URL,
    });
  }
  
  if (process.env.DEST_CHAIN_ID && process.env.DEST_CHAIN_RPC) {
    const destChainId = parseInt(process.env.DEST_CHAIN_ID);
    chains.set(destChainId, {
      chainId: destChainId,
      name: (process.env.DEST_CHAIN_NAME || `chain-${destChainId}`).toLowerCase(),
      rpc: buildRpcUrl(process.env.DEST_CHAIN_RPC),
      verifierAddress: process.env.VERIFIER_CONTRACT_ADDRESS as `0x${string}` | undefined,
      blockExplorerUrl: process.env.DEST_CHAIN_BLOCK_EXPLORER_URL,
    });
  }
  
  // Load chains from chains.ts
  for (const chain of chainsData) {
    chains.set(chain.id, {
      chainId: chain.id,
      name: chain.name.toLowerCase(),
      rpc: buildRpcUrl(chain.rpc),
      anchorAddress: chain.anchorAddress,
      verifierAddress: chain.verifierAddress,
      registryAddress: chain.registryAddress,
      blockExplorerUrl: chain.blockExplorerUrl,
    });
  }
  
  return chains;
}

const chains = parseChainConfig();

const defaultOriginChainId: number | string = process.env.ORIGIN_CHAIN_ID 
  ? (isNaN(parseInt(process.env.ORIGIN_CHAIN_ID)) ? process.env.ORIGIN_CHAIN_ID : parseInt(process.env.ORIGIN_CHAIN_ID))
  : (chains.size > 0 ? Array.from(chains.keys())[0] : 0);

const defaultDestChainId: number | string = process.env.DEST_CHAIN_ID
  ? (isNaN(parseInt(process.env.DEST_CHAIN_ID)) ? process.env.DEST_CHAIN_ID : parseInt(process.env.DEST_CHAIN_ID))
  : (chains.size > 1 ? Array.from(chains.keys())[1] : 0);

const rawBackendPrivateKey = process.env.BACKEND_PRIVATE_KEY as `0x${string}` | undefined;
if (!rawBackendPrivateKey) {
  throw new Error('BACKEND_PRIVATE_KEY must be configured');
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000'),
  chains,
  defaultOriginChainId,
  defaultDestChainId,
  backendPrivateKey: rawBackendPrivateKey,
};

export function getChainConfig(chainId: number | string): ChainConfig {
  const chain = config.chains.get(chainId);
  if (!chain) {
    throw new Error(`Chain ${chainId} is not configured`);
  }
  return chain;
}

export function resolveChainId(chainNameOrId: string | number | undefined): number | string | undefined {
  if (chainNameOrId === undefined || chainNameOrId === null) {
    return undefined;
  }

  if (typeof chainNameOrId === 'number') {
    if (config.chains.has(chainNameOrId)) {
      return chainNameOrId;
    }
    throw new Error(`Chain ID ${chainNameOrId} is not configured`);
  }

  const normalizedInput = String(chainNameOrId)
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const asNumber = parseInt(normalizedInput, 10);
  if (!isNaN(asNumber) && config.chains.has(asNumber)) {
    return asNumber;
  }

  for (const [chainId, chainConfig] of config.chains.entries()) {
    const normalizedChainName = chainConfig.name
      .toLowerCase()
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (normalizedChainName === normalizedInput) {
      return chainId;
    }
  }

  throw new Error(`Chain "${chainNameOrId}" is not configured. Available chains: ${Array.from(config.chains.values()).map(c => `${c.name} (${c.chainId})`).join(', ')}`);
}

