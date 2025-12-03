import { Router } from 'express';
import { CommitService } from '../services/commitService';
import { config, resolveChainId, getChainConfig } from '../config';
import { getWalletClient } from '../blockchain/clients';

const router = Router();
const commitService = new CommitService();

// Publish a new commit
router.post('/publish', async (req, res) => {
  try {
    const { commitHash, expiry, anchorChainId } = req.body;
    
    if (!commitHash || !commitHash.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Valid commitHash (0x...) is required',
      });
    }
    
    const anchorChainIdResolved = resolveChainId(anchorChainId);
    
    if (anchorChainIdResolved === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Anchor chain ID is required',
      });
    }
    
    const result = await commitService.publishCommit(
      commitHash as `0x${string}`,
      expiry ? BigInt(expiry) : 0n,
      anchorChainIdResolved
    );
    
    const chainConfig = getChainConfig(result.originChain);
    
    res.json({
      success: true,
      data: {
        ...result,
        originChainName: chainConfig.name,
      },
    });
  } catch (error: any) {
    console.error('Failed to publish commit:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to publish commit',
    });
  }
});

// Verify commit cross-chain
router.post('/verify', async (req, res) => {
  try {
    const { commitHash, originChainId, destChainId } = req.body;
    
    if (!commitHash || !commitHash.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Valid commitHash (0x...) is required',
      });
    }
    
    const originId = resolveChainId(originChainId) ?? config.defaultOriginChainId;
    const destId = resolveChainId(destChainId) ?? config.defaultDestChainId;
    
    const result = await commitService.verifyCommitCrossChain(
      commitHash as `0x${string}`,
      originId,
      destId
    );
    
    const originChainConfig = getChainConfig(result.originChain);
    const destChainConfig = getChainConfig(result.destChain);
    
    res.json({
      success: true,
      data: {
        ...result,
        originChainName: originChainConfig.name,
        destChainName: destChainConfig.name,
      },
    });
  } catch (error: any) {
    console.error('Failed to verify commit:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify commit',
    });
  }
});

// Get commit status
router.get('/:commitHash/status', async (req, res) => {
  try {
    const { commitHash } = req.params;
    const { originChainId, destChainId } = req.query;
    
    if (!commitHash.startsWith('0x')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid commit hash format' 
      });
    }

    const originId = resolveChainId(originChainId as string | number | undefined);
    const destId = resolveChainId(destChainId as string | number | undefined);

    const status = await commitService.getCommitStatus(
      commitHash as `0x${string}`,
      originId,
      destId
    );
    
    const usedOriginId = originId ?? config.defaultOriginChainId;
    const usedDestId = destId ?? config.defaultDestChainId;
    const originChainConfig = getChainConfig(usedOriginId);
    const destChainConfig = getChainConfig(usedDestId);
    
    res.json({ 
      success: true, 
      data: {
        commitHash,
        origin: {
          published: status.origin.published,
          revoked: status.origin.revoked,
          issuer: status.origin.issuer,
          publishedAt: status.origin.publishedAt.toString(),
          expiry: status.origin.expiry.toString(),
          chain: originChainConfig.name,
          chainId: usedOriginId,
        },
        destination: {
          verified: status.destination.verified,
          verifiedAt: status.destination.verifiedAt.toString(),
          chain: destChainConfig.name,
          chainId: usedDestId,
        },
      }
    });
  } catch (error: any) {
    console.error('Failed to get commit status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Revoke commit
router.post('/:commitHash/revoke', async (req, res) => {
  try {
    const { commitHash } = req.params;
    const { originChainId } = req.body;

    if (!commitHash.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid commit hash format'
      });
    }

    const chainId = resolveChainId(originChainId);

    const revocationHash = await commitService.revokeCommit(
      commitHash as `0x${string}`,
      chainId
    );

    const usedChainId = chainId ?? config.defaultOriginChainId;
    const chainConfig = getChainConfig(usedChainId);

    res.json({
      success: true,
      data: {
        commitHash,
        revocationHash,
        originChain: usedChainId,
        originChainName: chainConfig.name,
        message: 'Commit revoked successfully'
      }
    });
  } catch (error: any) {
    console.error('Failed to revoke commit:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


