import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';
import type { EventBus } from '../../infrastructure/events/EventBus.js';
import type { ActorRepository } from '../../infrastructure/repositories/ActorRepository.js';
import type { TokenRepository } from '../../infrastructure/repositories/TokenRepository.js';
import { ActorAdapterFactory } from '../../infrastructure/factories/ActorAdapterFactory.js';
import type { ActorUpdateEvent, TokenControlEvent, CanvasReadyEvent } from '../../infrastructure/events/FoundryEvents.js';
import { Actor } from '../entities/Actor.js';
import { Token } from '../entities/Token.js';
import type { HealthDisplayManager } from '../../presentation/ui/HealthDisplayManager.js';

/**
 * Domain service that monitors actor health changes
 */
export class ActorHealthMonitor {
    private readonly logger: FoundryLogger;
    private readonly eventBus: EventBus;
    private readonly actorRepository: ActorRepository;
    private readonly tokenRepository: TokenRepository;
    private readonly healthDisplayManager: HealthDisplayManager;
    private initialised = false;

    constructor(
        eventBus: EventBus,
        actorRepository: ActorRepository,
        tokenRepository: TokenRepository,
        healthDisplayManager: HealthDisplayManager
    ) {
        this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.ActorHealthMonitor`);
        this.eventBus = eventBus;
        this.actorRepository = actorRepository;
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

        const controlledTokenAdapters = this.tokenRepository.getControlledAsAdapter();

        if (!controlledTokenAdapters || controlledTokenAdapters.length === 0) {
            this.logger.warn(`No controlled token found for actor update: ${event.actorId}`);
            return;
        }

        const controlledToken = controlledTokenAdapters.find(adapter => {
            const token = new Token(adapter);
            return token.actorId === event.actorId;
        });

        if (!controlledToken) {
            this.logger.warn(`Controlled token not found for actor: ${event.actorId}`);
            return;
        }


        await this.processHealthUpdate(event.actorId);
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

        const controlledTokenAdapters = this.tokenRepository.getControlledAsAdapter();

        if (!controlledTokenAdapters || controlledTokenAdapters.length === 0) {
            this.logger.warn('No controlled tokens found');
            return;
        }

        const tokenAdapter = controlledTokenAdapters.find(adapter => {
            const token = new Token(adapter);
            return token.id === event.tokenId;
        });

        if (!tokenAdapter) {
            this.logger.warn(`Token not found among controlled tokens: ${event.tokenId}`);
            return;
        }

        const token = new Token(tokenAdapter);

        if (!token.actorId) {
            this.logger.warn(`Token ${token.name} has no associated actor`);
            return;
        }

        await this.processHealthUpdate(token.actorId);
    }

    /**
     * Handle canvas ready event
     */
    private async handleCanvasReady(event: CanvasReadyEvent): Promise<void> {
        // Get the first controlled token's actor
        const controlledActors = this.actorRepository.getFromControlledTokens();
        if (controlledActors.length === 0) {
            this.healthDisplayManager.clear();
            return;
        }

        const firstActor = controlledActors[0];
        if (!firstActor?.id) return;

        await this.processHealthUpdate(firstActor.id);
    }

    /**
     * Publish health update event using domain actor
     */
    private async processHealthUpdate(actorId: string): Promise<void> {
        try {
            const actorAdapter = ActorAdapterFactory.create(actorId);
            if (!actorAdapter) {
                this.logger.warn(`Could not create adapter for actor: ${actorId}`);
                return;
            }

            const actor = new Actor(actorAdapter);

            const health = actor.health;
            const maxHealth = actor.maxHealth;
            const tempHealth = actor.tempHealth;
            const healthPercentage = maxHealth > 0 ? Math.max(0, Math.min(1, health / maxHealth)) : 0;

            this.healthDisplayManager.updateHealthDisplay(health, healthPercentage, tempHealth);

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