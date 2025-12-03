// Generic commit service for blockchain anchor operations
// Handles publishing, verifying, and revoking commits on EVM chains

import { getPublicClient, getWalletClient } from '../blockchain/clients';
import { ANCHOR_ABI, VERIFIER_ABI, REGISTRY_ABI } from '../contracts/abis';
import { config, getChainConfig, resolveChainId } from '../config';
import { decodeErrorResult } from 'viem';

type ChainId = number | string;

type CommitStatus = {
  published: boolean;
  revoked: boolean;
  issuer: string;
  publishedAt: bigint;
  revokedAt: bigint;
  expiry: bigint;
  zkVerifyAttestationId: `0x${string}`;
};

type VerificationStatus = {
  verified: boolean;
  verifiedAt: bigint;
};

type CommitStatusReturn = {
  commitHash: `0x${string}`;
  origin: CommitStatus;
  destination: VerificationStatus;
};

const ZERO_ATTESTATION_ID = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

export class CommitService {
  async revokeCommit(
    commitHash: `0x${string}`,
    originChainId?: ChainId
  ): Promise<string> {
    const chainId = originChainId ?? config.defaultOriginChainId;

    const chainConfig = getChainConfig(chainId as number);
    if (!chainConfig.anchorAddress) {
      throw new Error(`Anchor contract not configured for chain ${chainId}`);
    }

    const walletClient = getWalletClient(chainId as number);
    const hash = await walletClient.writeContract({
      address: chainConfig.anchorAddress as `0x${string}`,
      abi: ANCHOR_ABI,
      functionName: 'revokeCommit',
      args: [commitHash],
    } as any);

    return hash;
  }

  async publishCommit(
    commitHash: `0x${string}`,
    expiry: bigint = 0n,
    originChainId?: ChainId
  ) {
    const chainId = originChainId ?? config.defaultOriginChainId;

    const chainConfig = getChainConfig(chainId as number);
    if (!chainConfig.anchorAddress) {
      throw new Error(`Anchor contract not configured for chain ${chainId}`);
    }

    const walletClient = getWalletClient(chainId as number);
    const publicClient = getPublicClient(chainId as number);

    try {
      const hash = await walletClient.writeContract({
        address: chainConfig.anchorAddress as `0x${string}`,
        abi: ANCHOR_ABI,
        functionName: 'publishCommit',
        args: [commitHash, expiry],
      } as any);

      await publicClient.waitForTransactionReceipt({ hash });

      return {
        commitHash,
        transactionHash: hash,
        originChain: chainId,
        issuer: walletClient.account?.address ?? '0x0000000000000000000000000000000000000000',
      };
    } catch (error: any) {
      if (error.message?.includes('AlreadyPublished')) {
        throw new Error(
          `Commit already published on-chain. Hash: ${commitHash}`
        );
      }
      throw error;
    }
  }

  async verifyCommitCrossChain(
    commitHash: `0x${string}`,
    originChainId?: ChainId,
    destChainId?: ChainId
  ) {
    const originId = originChainId ?? config.defaultOriginChainId;
    const destId = destChainId ?? config.defaultDestChainId;

    const { isValid } = await this.validateCommitOnOrigin(commitHash, originId);
    if (!isValid) {
      throw new Error('Commit not valid on origin chain');
    }

    if (typeof destId !== 'number') {
      throw new Error('Internal error: EVM verification code reached for non-EVM chain');
    }

    const verificationHash = await this.verifyOnEvmDestination(commitHash, originId, destId);

    return {
      commitHash,
      verificationHash,
      originChain: originId,
      destChain: destId,
    };
  }

  async getCommitStatus(
    commitHash: `0x${string}`,
    originChainId?: ChainId,
    destChainId?: ChainId
  ): Promise<CommitStatusReturn> {
    const originId = originChainId ?? config.defaultOriginChainId;
    const destId = destChainId ?? config.defaultDestChainId;

    const originStatus = await this.readOriginStatus(commitHash, originId);
    const destinationStatus = await this.readDestinationStatus(
      commitHash,
      originId,
      destId
    );

    return {
      commitHash,
      origin: originStatus,
      destination: destinationStatus,
    };
  }

  private async verifyOnEvmDestination(
    commitHash: `0x${string}`,
    originId: ChainId,
    destId: number
  ): Promise<`0x${string}`> {
    const destChainConfig = getChainConfig(destId);
    const originChainConfig = getChainConfig(originId);

    if (!destChainConfig.verifierAddress) {
      throw new Error(`Verifier contract not configured for destination chain ${destId}`);
    }

    if (!originChainConfig.anchorAddress) {
      throw new Error(`Anchor contract not configured for origin chain ${originId}`);
    }

    const destWalletClient = getWalletClient(destId);
    const destPublicClient = getPublicClient(destId);

    try {
      const originIdNum = typeof originId === 'number' ? originId : 0;
      const hash = await destWalletClient.writeContract({
        address: destChainConfig.verifierAddress as `0x${string}`,
        abi: VERIFIER_ABI,
        functionName: 'verifyCredential',
        args: [
          commitHash,
          BigInt(originIdNum),
          originChainConfig.anchorAddress as `0x${string}`,
          '0x01', // Minimal proof for MVP mode (contract requires non-empty proof)
        ],
      } as any);

      await destPublicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (error: any) {
      this.decodeAndThrowVerifierError(error);
      throw error;
    }
  }

  private decodeAndThrowVerifierError(error: any): void {
    if (!(error?.data || error?.cause?.data)) {
      return;
    }

    const errorData = error.data || error.cause?.data;
    try {
      const decoded = decodeErrorResult({
        abi: VERIFIER_ABI,
        data: errorData,
      });

      const errorMessages: Record<string, string> = {
        Unauthorized: 'The backend wallet is not authorized to verify commits on this chain.',
        AlreadyVerified: 'This commit has already been verified on the destination chain.',
        InvalidProof: 'The verification proof is invalid.',
      };

      const friendlyMessage = errorMessages[decoded.errorName] || decoded.errorName;
      throw new Error(`Verification failed: ${friendlyMessage}`);
    } catch {
      // Fall back to the original error if decoding fails.
    }
  }

  private async validateCommitOnOrigin(
    commitHash: `0x${string}`,
    originId: ChainId
  ): Promise<{ isValid: boolean }> {
    const originChainConfig = getChainConfig(originId as number);
    const originPublicClient = getPublicClient(originId as number);

    let isValid = false;

    if (originChainConfig.registryAddress) {
      try {
        const registryEntry = await originPublicClient.readContract({
          address: originChainConfig.registryAddress as `0x${string}`,
          abi: REGISTRY_ABI,
          functionName: 'registry',
          args: [commitHash],
        });

        const entryHash = Array.isArray(registryEntry) ? registryEntry[0] : (registryEntry.credentialHash || registryEntry.commitHash || registryEntry[0]);
        const entryActive = Array.isArray(registryEntry) ? registryEntry[4] === true : registryEntry.active === true;

        if (entryHash === commitHash && entryActive === true) {
          isValid = true;
        }
      } catch (error: any) {
        // Fall through to anchor check
      }
    }

    if (!isValid && originChainConfig.anchorAddress) {
      try {
        isValid = await originPublicClient.readContract({
          address: originChainConfig.anchorAddress as `0x${string}`,
          abi: ANCHOR_ABI,
          functionName: 'isValid',
          args: [commitHash],
        });
      } catch (error: any) {
        // Return false if check fails
      }
    }

    return { isValid };
  }

  private async readOriginStatus(
    commitHash: `0x${string}`,
    originId: ChainId
  ): Promise<CommitStatus> {
    const originChainConfig = getChainConfig(originId as number);
    if (!originChainConfig.anchorAddress) {
      throw new Error(`Anchor contract not configured for origin chain ${originId}`);
    }

    const originPublicClient = getPublicClient(originId as number);
    const commit = await originPublicClient.readContract({
      address: originChainConfig.anchorAddress as `0x${string}`,
      abi: ANCHOR_ABI,
      functionName: 'getCommit',
      args: [commitHash],
    });

    return this.mapAnchorCommit(commit);
  }

  private async readDestinationStatus(
    commitHash: `0x${string}`,
    originId: ChainId,
    destId: ChainId
  ): Promise<VerificationStatus> {
    const destChainConfig = getChainConfig(destId as number);
    if (!destChainConfig.verifierAddress) {
      throw new Error(`Verifier contract not configured for destination chain ${destId}`);
    }

    const originIdNum = typeof originId === 'number' ? originId : 0;
    const destPublicClient = getPublicClient(destId as number);
    const destStatus = await destPublicClient.readContract({
      address: destChainConfig.verifierAddress as `0x${string}`,
      abi: VERIFIER_ABI,
      functionName: 'getVerification',
      args: [commitHash, BigInt(originIdNum)],
    });
    const verified = Boolean(destStatus[0]);
    const verifiedAtValue = destStatus[1];
    const verifiedAt = typeof verifiedAtValue === 'bigint' ? verifiedAtValue : BigInt(verifiedAtValue ?? 0);

    return {
      verified,
      verifiedAt,
    };
  }

  private mapAnchorCommit(commit: any): CommitStatus {
    const published = Boolean(this.getCommitField(commit, 0, 'published'));
    const revoked = Boolean(this.getCommitField(commit, 1, 'revoked'));
    const issuer = (this.getCommitField(commit, 2, 'issuer') ?? '0x0000000000000000000000000000000000000000') as string;
    const publishedAt = BigInt(this.getCommitField(commit, 3, 'publishedAt') ?? 0);
    const revokedAt = BigInt(this.getCommitField(commit, 4, 'revokedAt') ?? 0);
    const expiry = BigInt(this.getCommitField(commit, 5, 'expiry') ?? 0);
    const zkVerifyAttestationId = (this.getCommitField(commit, 6, 'zkVerifyAttestationId') ?? ZERO_ATTESTATION_ID) as `0x${string}`;

    return {
      published,
      revoked,
      issuer,
      publishedAt,
      revokedAt,
      expiry,
      zkVerifyAttestationId,
    };
  }

  private getCommitField(commit: any, index: number, key: string) {
    if (Array.isArray(commit)) {
      return commit[index];
    }

    if (commit && key in commit) {
      return commit[key];
    }

    return commit?.[index];
  }
}

