/**
 * This class provides a centralised registry for managing overlay context builders. 
 * Context builders are responsible for creating the render context required
 * by overlay renderers, ensuring proper data transformation and validation for each overlay type.
 * 
 * The registry follows the Service Locator pattern, providing a single point of access to
 * all registered context builders while maintaining loose coupling between components.
 */

import type { OverlayContextBuilder } from '../../domain/interfaces/OverlayContextBuilder.js';
import type { FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';

import { LoggerFactory } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';
import { HealthArcContextBuilder } from '../coordinators/contextBuilders/HealthArcContextBuilder.js';
import { TokenInfoContextBuilder } from '../coordinators/contextBuilders/TokenInfoContextBuilder.js';

export class OverlayContextBuilderRegistry {
    private readonly builders = new Map<string, OverlayContextBuilder>();
    private readonly logger: FoundryLogger;
    private isInitialised = false;

    /**
     * Creates a new overlay context builder registry.
     * Default builders are registered on first access.
     */
    constructor() {
        this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.OverlayContextBuilderRegistry`);
    }

    // Public API

    /**
     * Ensures the registry is initialised with default builders.
     * This is called automatically on first access.
     */
    private ensureInitialised(): void {
        if (!this.isInitialised) {
            this.registerDefaultBuilders();
            this.isInitialised = true;
        }
    }

    /**
     * Registers a context builder for a specific overlay type.
     * 
     * If a builder already exists for the given ID, it will be replaced
     * and a warning will be logged.
     */
    register(id: string, builder: OverlayContextBuilder): void {
        if (!id?.trim()) {
            throw new Error('Context builder ID cannot be empty');
        }
        
        if (!builder) {
            throw new Error(`Context builder for '${id}' cannot be null or undefined`);
        }

        if (this.builders.has(id)) {
            this.logger.warn(`Replacing existing context builder for '${id}'`);
        }

        this.builders.set(id, builder);
        
        this.logger.debug('Context builder registered', { 
            id,
            builderType: builder.constructor.name,
            totalBuilders: this.builders.size
        });
    }

    /**
     * Retrieves a context builder by its overlay type identifier.
     */
    get(id: string): OverlayContextBuilder | undefined {
        this.ensureInitialised();
        
        const builder = this.builders.get(id);
        
        if (!builder) {
            this.logger.debug(`No context builder found for '${id}'`, {
                availableBuilders: Array.from(this.builders.keys())
            });
        }
        
        return builder;
    }

    /**
     * Checks if a context builder is registered for the given overlay type.
     */
    has(id: string): boolean {
        this.ensureInitialised();
        return this.builders.has(id);
    }

    /**
     * Removes a context builder from the registry.
     */
    unregister(id: string): boolean {
        const removed = this.builders.delete(id);
        
        if (removed) {
            this.logger.debug('Context builder unregistered', { id });
        }
        
        return removed;
    }

    /**
     * Gets all registered context builders.
     * 
     * Returns a defensive copy to prevent external modification of the registry.
     */
    getAll(): Map<string, OverlayContextBuilder> {
        this.ensureInitialised();
        return new Map(this.builders);
    }

    /**
     * Gets the identifiers of all registered context builders.
     */
    getRegisteredIds(): string[] {
        this.ensureInitialised();
        return Array.from(this.builders.keys());
    }

    /**
     * Gets the count of registered context builders.
     */
    size(): number {
        this.ensureInitialised();
        return this.builders.size;
    }

    /**
     * Clears all registered context builders.
     * 
     * This will remove all builders, including defaults. Use with caution.
     */
    clear(): void {
        const count = this.builders.size;
        this.builders.clear();
        this.isInitialised = false;
        
        this.logger.warn('All context builders cleared', { 
            removedCount: count 
        });
    }

    /**
     * Resets the registry to default state.
     * 
     * Clears all builders and re-registers the defaults.
     */
    reset(): void {
        this.clear();
        this.ensureInitialised();
        
        this.logger.info('Registry reset to default state');
    }

    // Private Methods

    /**
     * Registers all default context builders.
     * 
     * Default builders handle the standard overlay types provided by the module.
     * Custom overlays should register their builders separately.
     */
    private registerDefaultBuilders(): void {
        const defaultBuilders: Array<{ id: string; builder: OverlayContextBuilder }> = [
            { id: 'health-arc', builder: new HealthArcContextBuilder() },
            { id: 'token-info', builder: new TokenInfoContextBuilder() }
        ];

        for (const { id, builder } of defaultBuilders) {
            this.builders.set(id, builder);
        }

        this.logger.info(`Default context builders registered: ${defaultBuilders.length}`);
    }
}