export interface Chain {
    id: number | string;
    name: string;
    rpc: string;
    anchorAddress?: string;
    verifierAddress?: string;
    registryAddress?: string;
    blockExplorerUrl?: string;
}

export const CHAINS: Chain[] = [];

export default CHAINS;

