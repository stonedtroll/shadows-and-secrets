import type { TokenSightData, SightBoundary } from '../../domain/interfaces/SightlineTypes.js';

/**
 * Adapter that converts Foundry Token to domain TokenSightData
 * Bridges the gap between Foundry's Token representation and our domain model
 */
export class TokenSightDataAdapter {
    static fromFoundryToken(token: Token): TokenSightData {
        // In Foundry v13, vision can be null for tokens without sight
        // Provide a default SightBoundary that returns false for all checks
        const sightBoundary: SightBoundary = token.vision?.los ? {
            contains: (x: number, y: number) => token.vision!.los.contains(x, y)
        } : {
            // Default boundary for tokens without vision - can't see anything
            contains: (_x: number, _y: number) => false
        };

        return {
            id: token.id,
            name: token.name,
            position: { x: token.center.x, y: token.center.y },
            width: token.w,
            height: token.h,
            isVisible: token.visible,
            isHidden: token.document.hidden,
            isOwner: token.document.isOwner,
            isControlled: token.controlled,
            sightBoundary,
            visionRange: token.vision?.range,
            visionAngle: token.vision?.angle
        };
    }

    static fromFoundryTokens(tokens: Token[]): TokenSightData[] {
        return tokens.map(token => this.fromFoundryToken(token));
    }
}