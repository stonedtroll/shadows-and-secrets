import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';
import type { EventBus } from '../../infrastructure/events/EventBus.js';
import type { TokenRepository } from '../../infrastructure/repositories/TokenRepository.js';
import type { ActorUpdateEvent, TokenControlEvent, CanvasReadyEvent } from '../../infrastructure/events/FoundryEvents.js';
import { Token } from '../entities/Token.js';
import type { HealthDisplayManager } from '../../presentation/ui/HealthDisplayManager.js';

export class HealthMonitor {
    private readonly logger: FoundryLogger;
    private readonly eventBus: EventBus;
    private readonly tokenRepository: TokenRepository;
    private readonly healthDisplayManager: HealthDisplayManager;
    private initialised = false;

    constructor(
        eventBus: EventBus,
        tokenRepository: TokenRepository,
        healthDisplayManager: HealthDisplayManager
    ) {
        this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.HealthMonitor`);
        this.eventBus = eventBus;
        // this.actorRepository = actorRepository;
        this.tokenRepository = tokenRepository;
        this.healthDisplayManager = healthDisplayManager;
    }

    /**
     * Initialise health monitoring by subscribing to events
     */
    initialise(): void {
        if (this.initialised) return;

        this.eventBus.on('actor:update', this.handleActorUpdate.bind(this));
        this.eventBus.on('token:control', this.handleTokenControl.bind(this));
        this.eventBus.on('canvas:ready', this.handleCanvasReady.bind(this));

        this.initialised = true;
        this.logger.debug('Actor health monitoring initialised with event subscriptions');
    }

    /**
     * Handle actor update events from EventBus
     */
    private async handleActorUpdate(event: ActorUpdateEvent): Promise<void> {

        if (event.changes.health === undefined) {
            return;
        }

        const controlledToken = this.tokenRepository.getControlledByCurrentUser().find(token => {
            return token.actorId === event.actorId;
        });

        if (!controlledToken) {
            this.logger.warn(`Controlled token not found for actor: ${event.actorId}`);
            return;
        }


        await this.processHealthUpdate(controlledToken);
    }

    /**
     * Handle token control events from EventBus
     */
    private async handleTokenControl(event: TokenControlEvent): Promise<void> {
        if (!event.controlled) {
            this.healthDisplayManager.clear();
            this.logger.debug('Token unselected, cleared health display');
            return;
        }

        // Check if any tokens are still controlled
        const controlledTokens = this.tokenRepository.getControlledByCurrentUser();
        
        if (controlledTokens.length === 0) {
            this.healthDisplayManager.clear();
            this.logger.debug('No tokens controlled, cleared health display');
            return;
        }

        const controlledToken = controlledTokens.find(token => token.id === event.tokenId);

        if (!controlledToken) {
            this.logger.warn(`Token not found among controlled tokens: ${event.tokenId}`);
            return;
        }

        if (!controlledToken.actorId) {
            this.logger.warn(`Token ${controlledToken.name} has no associated actor`);
            this.healthDisplayManager.clear();
            return;
        }

        await this.processHealthUpdate(controlledToken);
    }

    /**
     * Handle canvas ready event
     */
    private async handleCanvasReady(event: CanvasReadyEvent): Promise<void> {
        // Always clear first, then check for controlled tokens
        this.healthDisplayManager.clear();
        
        const controlledTokens = this.tokenRepository.getControlledByCurrentUser();
        if (controlledTokens.length === 0) {
            this.logger.debug('Canvas ready: No controlled tokens, health display remains hidden');
            return;
        }

        const firstToken = controlledTokens[0];
        if (!firstToken?.actorId) {
            this.logger.debug('Canvas ready: First token has no actor, health display remains hidden');
            return;
        }

        this.logger.debug('Canvas ready: Updating health display for controlled token', { tokenName: firstToken.name });
        await this.processHealthUpdate(firstToken);
    }

    /**
     * Publish health update event using domain actor
     */
    private async processHealthUpdate(token: Token): Promise<void> {
        try {
            const health = token.health;
            const maxHealth = token.maxHealth;
            const tempHealth = token.tempHealth;
            const healthPercentage = maxHealth > 0 ? Math.max(0, Math.min(1, health / maxHealth)) : 0;

            this.logger.debug(`Processing health update for token ${token.name} (${token.id})`, {
                health,
                maxHealth,
                tempHealth,
                healthPercentage
            });

            this.healthDisplayManager.updateHealthDisplay(health, healthPercentage, tempHealth, token.portrait);

        } catch (error) {
            this.logger.error('Failed to process health update:', error);
        }
    }

    /**
     * Clean up resources and unsubscribe from events
     */
    destroy(): void {
        // Unsubscribe from all events
        this.eventBus.off('actor:update', this.handleActorUpdate.bind(this));
        this.eventBus.off('token:control', this.handleTokenControl.bind(this));
        this.eventBus.off('canvas:ready', this.handleCanvasReady.bind(this));

        this.initialised = false;

        this.logger.debug('Actor health monitor destroyed');
    }
}