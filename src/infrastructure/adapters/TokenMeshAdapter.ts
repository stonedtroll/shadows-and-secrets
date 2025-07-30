/**
 * Adapter to retrieve token meshes from Foundry tokens
 * Bridges Foundry's token system with the presentation layer's needs
 */
import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';

export class TokenMeshAdapter {
    private readonly logger: FoundryLogger;

    constructor() {
        this.logger = LoggerFactory.getInstance().getFoundryLogger('TokenMeshAdapter');
    }

    /**
     * Get the mesh for a token by ID
     */
    getMesh(tokenId: string): PIXI.Container | undefined {
        const token = canvas?.tokens?.get(tokenId);
        
        if (!token) {
            this.logger.debug(`Token not found: ${tokenId}`);
            return undefined;
        }
        
        if (!token.mesh) {
            this.logger.debug(`Token has no mesh: ${tokenId}`);
            return undefined;
        }
        
        return token.mesh as unknown as PIXI.Container;
    }
    
    /**
     * Check if a token exists and has a mesh
     */
    hasMesh(tokenId: string): boolean {
        const token = canvas?.tokens?.get(tokenId);
        return !!(token?.mesh);
    }
    
    /**
     * Get the token's current position
     */
    getTokenCentre(tokenId: string): { x: number; y: number } | null {
        const token = canvas?.tokens?.get(tokenId);
        if (!token) return null;
        
        return token.center || { x: token.x, y: token.y };
    }
    
    /**
     * Get the controlled state of a token
     */
    isControlled(tokenId: string): boolean {
        const token = canvas?.tokens?.get(tokenId);
        return token?.controlled ?? false;
    }
}