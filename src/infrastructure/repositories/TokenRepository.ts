/**
 * Repository for accessing and transforming token data from Foundry VTT canvas.
 */
import type { FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';

import  { Token } from '../../domain/entities/Token.js';
import { LoggerFactory } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';
import { TokenAdapter } from '../adapters/TokenAdapter.js';

export class TokenRepository {
    private readonly logger: FoundryLogger;

    constructor() {
        this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.TokenRepository`);
    }

    /**
     * Retrieves all tokens on the canvas.
     */
    getAll(): Token[] {

        if (!this.isCanvasReady()) {
            return [];
        }

        const allFoundryTokens = canvas!.tokens!.placeables as globalThis.Token[];

        return allFoundryTokens.map(token => new Token(new TokenAdapter(token)));
    }

    /**
     * Retrieves tokens controlled by the current user.
     */
    getControlledByCurrentUser(): Token[] {

        if (!this.isCanvasReady()) {
            return [];
        }

        const controlledFoundryTokens = canvas!.tokens!.controlled as globalThis.Token[];

        if (!controlledFoundryTokens || controlledFoundryTokens.length === 0) {
            return [];
        }

        return this.getAll().filter(token => token.isControlledByCurrentUser);
    }

    /**
     * Retrieves tokens owned by the current user.
     */
    getOwnedByCurrentUser(): Token[] {

        if (!this.isCanvasReady()) {
            return [];
        }

        return this.getAll().filter(token => token.isOwnedByCurrentUser);
    }

    /**
     * Retrieves a specific token by ID.
     */
    getById(tokenId: string): Token | undefined {
        if (!this.isCanvasReady()) {
            return undefined;
        }

        const foundryToken = canvas!.tokens!.get(tokenId) as globalThis.Token | undefined;

        return foundryToken ? new Token(new TokenAdapter(foundryToken)) : undefined;
    }

    /**
     * Retrieves tokens by actor ID.
     */
    getByActorId(actorId: string): Token[] {
        return this.getAll().filter(token => token.actorId === actorId);
    }

    /**
     * Retrieves visible tokens on the canvas.
     */
    getVisible(): Token[] {
        return this.getAll().filter(token => token.visible);
    }

    /**
     * Checks if the canvas is ready for token operations.
     */
    private isCanvasReady(): boolean {
        return Boolean(canvas?.ready && canvas?.tokens);
    }
}