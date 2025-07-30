// src/infrastructure/repositories/FoundryTokenSightRepository.ts
import type { TokenSightRepository, TokenSightData } from '../../domain/interfaces/SightlineTypes.js';
import { TokenSightDataAdapter } from '../adapters/TokenSightDataAdapter.js';

export class FoundryTokenSightRepository implements TokenSightRepository {
    async getTokenSightData(tokenId: string): Promise<TokenSightData | null> {
        const token = canvas.tokens?.get(tokenId);
        return token ? TokenSightDataAdapter.fromFoundryToken(token) : null;
    }

    async getTokensSightData(tokenIds: string[]): Promise<TokenSightData[]> {
        return tokenIds
            .map(id => canvas.tokens?.get(id))
            .filter((token): token is Token => token !== undefined)
            .map(token => TokenSightDataAdapter.fromFoundryToken(token));
    }

    async getAllVisibleTokensSightData(): Promise<TokenSightData[]> {
        if (!canvas.tokens?.placeables) return [];
        
        return canvas.tokens.placeables
            .filter(token => token.visible)
            .map(token => TokenSightDataAdapter.fromFoundryToken(token));
    }

    async getControlledTokensSightData(userId: string): Promise<TokenSightData[]> {
        if (!canvas.tokens?.controlled) return [];
        
        return canvas.tokens.controlled
            .map(token => TokenSightDataAdapter.fromFoundryToken(token));
    }
}