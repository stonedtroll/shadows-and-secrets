/**
 * Repository for accessing and transforming token data from Foundry VTT canvas.
 */

import type { FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import type { AbstractTokenAdapter } from '../../application/adapters/AbstractTokenAdapter.js';
import type { TokenState, MovementMode, MovementActionType } from '../events/FoundryEvents.js';

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
            this.logger.debug('Canvas not ready for token retrieval');
            return [];
        }

        return canvas!.tokens!.placeables as Token[];
    }

    /**
     * Retrieves all token adapters for canvas tokens.
     */
    getAllAsAdapters(): AbstractTokenAdapter[] {
        return this.getAll().map(token => new TokenAdapter(token));
    }

    getAsAdapter(token: Token): AbstractTokenAdapter {
        return new TokenAdapter(token);
    }
    
    getControlledAsAdapter(): AbstractTokenAdapter[] {
        const controlled = this.getControlled();

        return controlled.map(token => new TokenAdapter(token));
    }

    /**
     * Retrieves tokens controlled by the current user.
     */
    getControlled(): Token[] {
        if (!this.isCanvasReady()) {
            return [];
        }

        const controlled = (canvas!.tokens!.controlled as unknown) as Set<Token>;

        if (!controlled || controlled.size === 0) {
            return [];
        }

        return Array.from(controlled);
    }

    /**
     * Retrieves tokens controlled by the current user as adapters.
     */
    getControlledAsAdapters(): AbstractTokenAdapter[] {
        return this.getControlled().map(token => new TokenAdapter(token));
    }

    /**
     * Retrieves tokens owned by the current user.
     */
    getOwnedByCurrentUser(): Token[] {
        return this.getAll().filter(token => token.isOwner);
    }

    /**
     * Retrieves tokens owned by the current user as adapters.
     */
    getOwnedByCurrentUserAsAdapters(): AbstractTokenAdapter[] {
        return this.getOwnedByCurrentUser().map(token => new TokenAdapter(token));
    }

    /**
     * Retrieves a specific token by ID.
     */
    getById(tokenId: string): Token | undefined {
        if (!this.isCanvasReady()) {
            return undefined;
        }

        return canvas!.tokens!.get(tokenId) as Token | undefined;
    }

    /**
     * Retrieves tokens by actor ID.
     */
    getByActorId(actorId: string): Token[] {
        return this.getAll().filter(token => token.actor?.id === actorId);
    }

    /**
     * Converts a token to a simplified state object.
     */
    toTokenState(token: Token): TokenState {
        return {
            id: token.id,
            name: token.name || 'Unknown',
            ownedByCurrentUser: token.isOwner,
            controlled: token.controlled,
            visible: token.visible,
            x: token.x,
            y: token.y,
            width: token.w,
            height: token.h,
            rotation: token.document.rotation,
            elevation: token.document.elevation,
            scale: token.document.scale,
            hidden: token.document.hidden,
            disposition: token.document.disposition
        };
    }

    /**
     * Retrieves all tokens as simplified state objects.
     */
    getAllAsStates(): TokenState[] {
        return this.getAll().map(token => this.toTokenState(token));
    }

    /**
     * Extracts movement modes from a token's actor.
     */
    extractMovementModes(token: Token): MovementMode[] {
        try {
            const movementData = token.actor?.system?.attributes?.movement;

            if (!movementData || typeof movementData !== 'object') {
                return [];
            }

            const movementModes: MovementMode[] = [];
            const validMovementTypes = ['walk', 'climb', 'fly', 'swim', 'burrow'] as const;
            const defaultUnits = movementData.units || 'm';

            for (const movementType of validMovementTypes) {
                const movementValue = movementData[movementType];

                if (typeof movementValue === 'number' && movementValue > 0) {
                    movementModes.push({
                        type: movementType,
                        speed: movementValue,
                        units: defaultUnits
                    });
                }
            }

            return movementModes;
        } catch (error) {
            this.logger.warn('Failed to extract movement modes', {
                tokenId: token.id,
                error: error instanceof Error ? error.message : String(error)
            });
            return [];
        }
    }

    /**
     * Determines a token's current movement action.
     */
    getCurrentMovementAction(token: Token): MovementActionType {
        try {
            const documentAction = token.document.movementAction;

            if (documentAction && this.isValidMovementAction(documentAction)) {
                return documentAction as MovementActionType;
            }

            return 'walk';
        } catch (error) {
            this.logger.debug('Error determining movement action', {
                tokenId: token.id,
                error: error instanceof Error ? error.message : String(error)
            });
            return 'walk';
        }
    }

    /**
     * Retrieves visible tokens on the canvas.
     */
    getVisible(): Token[] {
        return this.getAll().filter(token => token.visible);
    }

    /**
     * Retrieves visible tokens on the canvas as adapters.
     */
    getVisibleAsAdapters(): AbstractTokenAdapter[] {
        return this.getVisible().map(token => new TokenAdapter(token));
    }

    /**
     * Checks if the canvas is ready for token operations.
     */
    private isCanvasReady(): boolean {
        return Boolean(canvas?.ready && canvas?.tokens);
    }

    /**
     * Type guard for valid movement actions.
     */
    private isValidMovementAction(action: string | null): action is MovementActionType {
        if (!action) return false;

        const validActions: MovementActionType[] = ['walk', 'climb', 'fly', 'swim', 'burrow', 'hover'];
        return validActions.includes(action as MovementActionType);
    }
}